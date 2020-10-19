module.exports = (sequelize, type) => {
  const LogModel = sequelize.define('log', {
    id: {
      type: type.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    source: {
      type: type.STRING,
      allowNull: true,
    },
    payload: {
      type: type.TEXT,
      allowNull: true,
    },
    content: {
      type: type.TEXT,
      allowNull: true,
    },
    status: {
      type: type.STRING,
      allowNull: true,
    },
  }, {
    timestamps: true,
    underscored: true,
    tableName: 'logs',
  });

  return LogModel;
};
